import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Check if the scroll area exists or simply scroll the window
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
    
    // Fallback for custom scroll containers if any
    const scrollContainer = document.querySelector('main');
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }
  }, [pathname]);

  return null;
};
