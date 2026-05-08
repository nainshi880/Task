(() => {
  const mobileCanvas = document.querySelector(".mobile-canvas");
  const menuButton = document.getElementById("mobileMenuToggle");
  const menuOverlay = document.getElementById("mobileMenuOverlay");

  if (!mobileCanvas || !menuButton || !menuOverlay) return;

  const setMenuState = (isOpen) => {
    mobileCanvas.classList.toggle("is-menu-open", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  };

  menuButton.addEventListener("click", () => {
    setMenuState(!mobileCanvas.classList.contains("is-menu-open"));
  });

  menuOverlay.addEventListener("click", () => {
    setMenuState(false);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenuState(false);
  });
})();
