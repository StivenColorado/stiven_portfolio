import React from 'react';

interface RedisIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

const RedisIcon: React.FC<RedisIconProps> = ({ size = 24, ...props }) => (
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
    <path d="M3 8l9-4 9 4-9 4z" />
    <path d="M3 12l9 4 9-4" />
    <path d="M3 16l9 4 9-4" />
  </svg>
);

export default RedisIcon;
