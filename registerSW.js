if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/mindpal/sw.js", { scope: "/mindpal/" })
      .then((reg) => {
        try {
          reg.update();
        } catch {}
      })
      .catch(() => {});
    let refreshed = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshed) return;
      refreshed = true;
      const url = new URL(location.href);
      if (!url.searchParams.has("cb")) {
        url.searchParams.set("cb", "shell-v6");
        location.replace(url.href);
        return;
      }
      location.reload();
    });
  });
}
