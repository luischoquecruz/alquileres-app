import { useState, useEffect } from "react";

const MOBILE_BREAK = 768;
export const useMobile = () => {
  const [mobile, setMobile] = useState(window.innerWidth < MOBILE_BREAK);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < MOBILE_BREAK);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return mobile;
};
