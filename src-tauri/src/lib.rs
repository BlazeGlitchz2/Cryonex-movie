mod adblock;

use std::collections::HashSet;
use std::sync::Mutex;
use tauri::{Manager, Url};

struct EmbedHosts(Mutex<HashSet<String>>);

fn is_app_url(url: &Url) -> bool {
  match url.scheme() {
    "tauri" => true,
    "about" => url.as_str() == "about:blank",
    "http" => cfg!(debug_assertions) && url.host_str() == Some("localhost") && url.port() == Some(1420),
    "https" => url.host_str() == Some("tauri.localhost"),
    _ => false,
  }
}

fn base_embed_hosts() -> HashSet<String> {
  [
    "peachify.net",
    "embed.vidrift.net",
    "ythd.org",
    "vidlink.pro",
    "vidfast.vc",
    "vidora.su",
    "vidsrc.to",
    "vidsrc.net",
    "player.vidzee.wtf",
    "2embed.cc",
    "www.2embed.cc",
    "vidsrc.me",
    "vidsrc.pm",
    "vixsrc.to",
    "vidrock.net",
    "multiembed.mov",
    "streamsrcs.2embed.cc",
    "youtube.com",
    "www.youtube.com",
    "youtube-nocookie.com",
    "www.youtube-nocookie.com",
  ]
  .into_iter()
  .map(String::from)
  .collect()
}

#[tauri::command]
fn set_embed_hosts(hosts: Vec<String>, state: tauri::State<EmbedHosts>) {
  *state.0.lock().unwrap() = hosts.into_iter().collect();
}

fn effects_config() -> tauri::utils::config::WindowEffectsConfig {
  tauri::utils::config::WindowEffectsConfig {
    effects: vec![tauri::utils::WindowEffect::UnderWindowBackground],
    state: Some(tauri::utils::WindowEffectState::Active),
    ..Default::default()
  }
}

// Reads the real NSWindow state: opacity flag plus the count of blur subviews.
#[cfg(target_os = "macos")]
fn vibrancy_state(window: &tauri::WebviewWindow) -> String {
  use objc2::msg_send;
  use objc2::runtime::AnyObject;
  unsafe {
    let Ok(ns_window_ptr) = window.ns_window() else {
      return "no ns_window".to_string();
    };
    let ns_window = ns_window_ptr as *mut AnyObject;
    let is_opaque: bool = msg_send![ns_window, isOpaque];
    let content: *mut AnyObject = msg_send![ns_window, contentView];
    if content.is_null() {
      return format!("isOpaque={is_opaque} contentView=null");
    }
    let subviews: *mut AnyObject = msg_send![content, subviews];
    let count: usize = msg_send![subviews, count];
    let mut blur_views = 0usize;
    for index in 0..count {
      let view: *mut AnyObject = msg_send![subviews, objectAtIndex: index];
      let class: *mut AnyObject = msg_send![view, class];
      let class_name: *mut AnyObject = msg_send![class, className];
      let utf8: *const std::ffi::c_char = msg_send![class_name, UTF8String];
      if !utf8.is_null() {
        let name = std::ffi::CStr::from_ptr(utf8).to_string_lossy();
        if name.contains("VisualEffect") || name.contains("GlassEffect") {
          blur_views += 1;
        }
      }
    }
    format!("isOpaque={is_opaque} contentSubviews={count} blurViews={blur_views}")
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(EmbedHosts(Mutex::new(base_embed_hosts())))
    .invoke_handler(tauri::generate_handler![set_embed_hosts])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // create: false in tauri.conf.json so containment hooks attach at build time
      let config = app
        .config()
        .app
        .windows
        .iter()
        .find(|w| !w.create)
        .expect("main window must be declared with create: false in tauri.conf.json");

      let handle = app.handle().clone();
      let window = tauri::WebviewWindowBuilder::from_config(app.handle(), config)?
        // wry fires this for every frame load, iframes included: allow app
        // pages plus the synced embed host list, cancel everything else
        .on_navigation(move |url| {
          is_app_url(url)
            || handle
              .state::<EmbedHosts>()
              .0
              .lock()
              .unwrap()
              .contains(url.host_str().unwrap_or_default())
        })
        // embed players' window.open popups are denied natively, iframes stay functional
        .on_new_window(|_url, _features| tauri::webview::NewWindowResponse::Deny)
        // from_config is not trusted to carry effects, so vibrancy is chained explicitly
        .effects(effects_config())
        .build()?;

      // prove the native blur layer exists; retry once through the runtime API if not
      #[cfg(target_os = "macos")]
      {
        let mut state = vibrancy_state(&window);
        log::info!("vibrancy initial: {state}");
        if state.contains("blurViews=0") {
          if let Err(e) = window.set_effects(Some(effects_config())) {
            log::warn!("vibrancy retry failed: {e}");
          }
          state = vibrancy_state(&window);
          log::info!("vibrancy after retry: {state}");
        }
      }

      // native content blocker rules reach the cross-origin player iframes, no frontend filter can
      #[cfg(target_os = "macos")]
      if let Err(e) = window.with_webview(|webview| adblock::install(webview.controller())) {
        log::warn!("adblock: could not reach platform webview: {e}");
      }
      #[cfg(not(target_os = "macos"))]
      let _ = &window;

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
