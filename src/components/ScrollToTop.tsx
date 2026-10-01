import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";

const LEGACY_ANCHORS: Record<string, string> = {
    "#servicios": "/services",
    "#contacto": "/contact",
};

const ScrollToTop = () => {
    const { pathname, hash } = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const legacy = pathname === "/" ? LEGACY_ANCHORS[hash] : undefined;
        if (legacy) {
            navigate(legacy, { replace: true });
            return;
        }
        const target = hash ? document.getElementById(hash.slice(1)) : null;
        if (target) target.scrollIntoView({ behavior: "instant" });
        else window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }, [pathname, hash, navigate]);

    return null;
};

export default ScrollToTop;
