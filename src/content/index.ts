// Runs on YouTube so future feed integration can handle in-site navigation.
// Grouped rendering and creator assignment controls are the next milestone.
function onNavigation(): void {
  if (window.location.pathname !== '/feed/subscriptions') return;
  console.debug('[YouTube Subscription Groups] Extension scaffold loaded.');
}

document.addEventListener('yt-navigate-finish', onNavigation);
onNavigation();
