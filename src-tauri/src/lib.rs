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
    "vidlink.pro",
    "vidfast.vc",
    "vidora.su",
    "vidsrc.to",
    "vidsrc.net",
    "player.vidzee.wtf",
    "2embed.cc",
    "www.2embed.cc",
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
        .effects(tauri::utils::config::WindowEffectsConfig {
          effects: vec![tauri::utils::WindowEffect::UnderWindowBackground],
          state: Some(tauri::utils::WindowEffectState::Active),
          ..Default::default()
        })
        .build()?;

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
