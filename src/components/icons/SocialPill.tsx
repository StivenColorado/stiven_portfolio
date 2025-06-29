import React, { type ReactNode } from 'react';

interface SocialPillProps {
  href: string;
  children: ReactNode;
  className?: string;
}

const SocialPill: React.FC<SocialPillProps> = ({
  href,
  children,
  className = '',
  ...props
}) => {
  return (
    <a
      href={href}
      className={`
        rounded-full text-white border border-white/10 
        flex justify-center items-center gap-x-2 
        py-1 px-2 text-xs md:text-base md:py-3 md:px-2 
        bg-white/10 hover:scale-110 hover:bg-white/20
        transition-transform duration-200
        ${className}
      `}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  );
};

export default SocialPill;
