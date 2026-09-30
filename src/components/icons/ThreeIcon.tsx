import React from 'react';

interface ThreeIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

const ThreeIcon: React.FC<ThreeIconProps> = ({ size = 24, ...props }) => (
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
    <path d="M12 3L4 19h16z" />
    <path d="M12 3l-4 16M12 3l4 16M8 11h8" />
  </svg>
);

export default ThreeIcon;
