import React from 'react';

interface SupabaseIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

const SupabaseIcon: React.FC<SupabaseIconProps> = ({ size = 24, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    aria-hidden="true"
    {...props}
  >
    <path d="M13 3L4 14h7l-1 7 9-11h-7z" />
  </svg>
);

export default SupabaseIcon;
