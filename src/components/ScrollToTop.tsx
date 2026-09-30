import { useEffect } from "react";
import { useLocation } from "react-router";

const ScrollToTop = () => {
    const { pathname, hash } = useLocation();

    useEffect(() => {
        const target = hash ? document.getElementById(hash.slice(1)) : null;
        if (target) target.scrollIntoView({ behavior: "instant" });
        else window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }, [pathname, hash]);

    return null;
};

export default ScrollToTop;
