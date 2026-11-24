//! Native ad blocking for cross-origin embed players.
//! Frontend code cannot touch embed iframes, so we compile Safari-style
//! content blocker rules onto the WKWebView: WebKit applies them to every
//! frame, the player iframes included.

use std::ffi::c_void;

#[cfg(target_os = "macos")]
use objc2::MainThreadMarker;
#[cfg(target_os = "macos")]
use objc2::rc::Retained;
#[cfg(target_os = "macos")]
use objc2_foundation::{NSError, NSString};
#[cfg(target_os = "macos")]
use objc2_web_kit::{WKContentRuleList, WKContentRuleListStore, WKUserContentController};

/// Compiled into a WKContentRuleList at startup and attached to the
/// webview's user content controller so it applies in all frames.
/// WebKit url-filters reject regex disjunctions (|), so network blocks use
/// one catch-all filter gated by if-domain arrays instead.
pub const CONTENT_BLOCKER_RULES: &str = r#"[
  {
    "trigger": {
      "url-filter": ".*",
      "if-domain": [
        "*doubleclick.net", "*googlesyndication.com", "*googleadservices.com",
        "*googletagservices.com", "*google-analytics.com", "*adservice.google.com",
        "*imasdk.googleapis.com", "*amazon-adsystem.com", "*criteo.com",
        "*criteo.net", "*adnxs.com", "*adform.net", "*adform.com",
        "*casalemedia.com", "*pubmatic.com", "*rubiconproject.com",
        "*openx.net", "*smartadserver.com", "*adroll.com", "*teads.tv",
        "*media.net", "*bidgear.com", "*adsrvr.org", "*bidswitch.net",
        "*mathtag.com", "*indexexchange.com", "*33across.com", "*triplelift.com",
        "*sharethrough.com", "*yieldmo.com", "*sovrn.com", "*lijit.com",
        "*gumgum.com", "*tribalfusion.com", "*districtm.io", "*contextweb.com",
        "*rlcdn.com", "*conversantmedia.com", "*valueclick.com", "*demdex.net",
        "*adobedtm.com", "*serving-sys.com", "*moatads.com",
        "*popads.net", "*propellerads.com", "*monetag.com", "*adsterra.com",
        "*hilltopads.com", "*hilltopads.net", "*exoclick.com", "*juicyads.com",
        "*clickadu.com", "*popcash.net", "*adcash.com", "*zeropark.com",
        "*admaven.com", "*evadav.com", "*trafficfactory.biz", "*popunderclick.com",
        "*mgid.com", "*taboola.com", "*outbrain.com", "*revcontent.com",
        "*nativo.com", "*nativo.net", "*zergnet.com", "*dianomi.com",
        "*content.ad", "*adblade.com",
        "*connatix.com", "*primis.tech", "*aniview.com", "*cedato.com",
        "*spotxchange.com", "*spotx.tv", "*springserve.com", "*sekindo.com",
        "*vidoomy.com", "*vdo.ai", "*vi.ai", "*viralize.com", "*viralize.tv",
        "*videohub.tv", "*innovid.com", "*beachfront.com", "*unruly.co",
        "*yldbt.com", "*chocolate-platform.com", "*mantisadnetwork.com",
        "*vidcrunch.com",
        "*allmygoodlife.com", "*allmygreatestlife.com", "*allmygreatlife.com",
        "*allmyverygreatlife.com", "*mygoodlives.com", "*find-my-great-life.com",
        "*totogetica.com", "*togenron.com", "*stremanp.com", "*vidcpm.com",
        "*dadspms.com", "*ehu96t2p.com", "*inabsolor.com", "*ie8eamus.com",
        "*bestvideo2019.xyz", "*fingahvf.top", "*mc.yandex.ru",
        "*scorecardresearch.com", "*quantserve.com", "*adsafeprotected.com",
        "*doubleverify.com", "*ezoic.net", "*ezoic.com", "*pubfuture.com",
        "*bidvertiser.com", "*adpushup.com", "*setupad.com", "*infolinks.com",
        "*tsyndicate.com", "*trafficstars.com", "*adspyglass.com",
        "*clickaine.com", "*pushcrew.com", "*pushengage.com", "*pushnami.com",
        "*onesignal.com", "*izooto.com",
        "*advertising.com", "*adtechus.com", "*adtech.de", "*adition.com",
        "*galaksion.com", "*adskeeper.co.uk", "*realsrv.com", "*exosrv.com",
        "*comscore.com", "*bebi.com", "*bebi.net", "*zedo.com", "*megapu.sh",
        "*adnium.com", "*trafficjunky.com", "*a-ads.com",
        "*smartyads.com", "*adpone.com", "*admatic.com.tr", "*admatic.io",
        "*coinzilla.com", "*bitmedia.io", "*a-ads.net"
      ]
    },
    "action": { "type": "block" }
  },
  {
    "trigger": { "url-filter": "ads\\.js" },
    "action": { "type": "block" }
  },
  {
    "trigger": { "url-filter": "popunder" },
    "action": { "type": "block" }
  },
  {
    "trigger": { "url-filter": "-banner-" },
    "action": { "type": "block" }
  },
  {
    "trigger": { "url-filter": "/prebid" },
    "action": { "type": "block" }
  },
  {
    "trigger": { "url-filter": "/adserver/" },
    "action": { "type": "block" }
  },
  {
    "trigger": { "url-filter": "/advert" },
    "action": { "type": "block" }
  },
  {
    "trigger": { "url-filter": "vast" },
    "action": { "type": "block" }
  },
  {
    "trigger": { "url-filter": "adzone" },
    "action": { "type": "block" }
  },
  {
    "trigger": { "url-filter": "adframe" },
    "action": { "type": "block" }
  },
  {
    "trigger": { "url-filter": "ad_iframe" },
    "action": { "type": "block" }
  },
  {
    "trigger": { "url-filter": "/preroll" },
    "action": { "type": "block" }
  },
  {
    "trigger": { "url-filter": "pagead" },
    "action": { "type": "block" }
  },
  {
    "trigger": { "url-filter": "adsbygoogle" },
    "action": { "type": "block" }
  },
  {
    "trigger": {
      "url-filter": ".*",
      "if-domain": [
        "*vidzee.wtf",
        "*peachify.net",
        "*vidrift.net",
        "*ythd.org",
        "*vidora.su",
        "*vidsrc.to",
        "*vidsrc.net",
        "*vidsrc.me",
        "*vidsrc.pm",
        "*vidlink.pro",
        "*2embed.cc",
        "*vidfast.vc",
        "*vixsrc.to",
        "*vidrock.net",
        "*multiembed.mov"
      ]
    },
    "action": {
      "type": "css-display-none",
      "selector": ".ad-overlay,[id*='ad-overlay'],[class*='ad-banner'],[id^='ads_'],.popup-ad,[id*='popunder'],[class*='advert'],[id*='advert'],[class*='ad-slot'],[class*='ad-wrapper'],[class*='ad-container'],[id*='adContainer'],[class*='adbox'],[class*='ad_box'],[class*='google-ad'],.adsbygoogle,[class*='sponsor'],[class*='vast'],[id*='vast'],[id*='popad'],[class*='pop-ad'],iframe[src*='doubleclick'],iframe[src*='googlesyndication'],iframe[src*='/ads/'],iframe[src*='adserver'],iframe[src*='exoclick'],iframe[src*='juicyads'],iframe[src*='propeller']"
    }
  }
]"#;

const RULE_LIST_IDENTIFIER: &str = "com.cryonex.embed-adblock";

/// Compiles the rules and attaches the result to the webview's user content
/// controller. Safe to call once per webview; logs and returns on failure.
#[cfg(target_os = "macos")]
pub fn install(controller: *mut c_void) {
    let Some(mtm) = MainThreadMarker::new() else {
        log::warn!("adblock: install skipped, not on the main thread");
        return;
    };
    let store = unsafe { WKContentRuleListStore::defaultStore(mtm) };
    let Some(store) = store else {
        log::warn!("adblock: no default content rule list store available");
        return;
    };
    let controller = controller as *mut WKUserContentController;
    if controller.is_null() {
        log::warn!("adblock: webview has no user content controller");
        return;
    }

    // the store rejects compiling an identifier it already holds, so drop any stale list first
    let identifier = NSString::from_str(RULE_LIST_IDENTIFIER);
    let compile_identifier = identifier.clone();
    let store_for_compile = store.clone();
    let remove_done = block2::RcBlock::new(move |_remove_error: *mut NSError| {
        // a not-found error on first launch is expected and ignored here
        let encoded = NSString::from_str(CONTENT_BLOCKER_RULES);
        let compile_done = block2::RcBlock::new(
            move |list: *mut WKContentRuleList, compile_error: *mut NSError| {
                // the block hands over owned objects, retain them before any use
                if let Some(err) = unsafe { Retained::retain(compile_error) } {
                    log::warn!("adblock: rule compile failed: {}", err.localizedDescription());
                    return;
                }
                let retained_list = unsafe { Retained::retain(list) };
                let Some(list) = retained_list else {
                    log::warn!("adblock: rule compile returned no list");
                    return;
                };
                if MainThreadMarker::new().is_none() {
                    log::warn!("adblock: compile finished off the main thread, skipping install");
                    return;
                }
                let controller = unsafe { &*controller };
                unsafe { controller.addContentRuleList(&list) };
                log::info!("adblock: content blocker installed for all frames");
            },
        );
        unsafe {
            store_for_compile.compileContentRuleListForIdentifier_encodedContentRuleList_completionHandler(
                Some(&compile_identifier),
                Some(&encoded),
                Some(&compile_done),
            );
        }
    });
    unsafe {
        store.removeContentRuleListForIdentifier_completionHandler(
            Some(&identifier),
            Some(&remove_done),
        );
    }
}

#[cfg(not(target_os = "macos"))]
pub fn install(_controller: *mut c_void) {}
