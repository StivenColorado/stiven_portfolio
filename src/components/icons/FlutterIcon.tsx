import React from 'react';

interface FlutterIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

const FlutterIcon: React.FC<FlutterIconProps> = ({ size = 24, ...props }) => (
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
    <path d="M14 3L5 12l3 3L20 3z" />
    <path d="M14 13l-3 3 4 5h5z" />
  </svg>
);

export default FlutterIcon;
