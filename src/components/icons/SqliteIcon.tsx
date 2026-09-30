import React from 'react';

interface SqliteIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

const SqliteIcon: React.FC<SqliteIconProps> = ({ size = 24, ...props }) => (
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
    <ellipse cx="12" cy="6" rx="7" ry="3" />
    <path d="M5 6v12c0 1.7 3 3 7 3s7-1.3 7-3V6" />
    <path d="M5 12c0 1.7 3 3 7 3s7-1.3 7-3" />
  </svg>
);

export default SqliteIcon;
