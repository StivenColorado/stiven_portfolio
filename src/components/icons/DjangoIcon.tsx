import React from 'react';

interface DjangoIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

const DjangoIcon: React.FC<DjangoIconProps> = ({
  className = '',
  size = 24,
  ...props
}) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 32 32"
      className={className}
      width={size}
      height={size}
      {...props}
    >
      <path
        d="M14.135 4H18.1v18.169a26.218 26.218 0 0 1-5.143.535c-4.842-.005-7.362-2.168-7.362-6.322 0-4 2.673-6.6 6.816-6.6a6.448 6.448 0 0 1 1.724.2V4Zm0 9.142a3.992 3.992 0 0 0-1.337-.2c-2 0-3.163 1.223-3.163 3.366 0 2.087 1.107 3.239 3.138 3.239a9.355 9.355 0 0 0 1.362-.1v-6.3Z"
        fill="#44b78b"
      />
      <path
        d="M24.4 10.059v9.1c0 3.133-.235 4.639-.923 5.938A6.316 6.316 0 0 1 20.237 28l-3.678-1.733a5.708 5.708 0 0 0 3.141-2.629c.566-1.121.745-2.42.745-5.837v-7.742ZM20.441 4.02h3.964v4.028h-3.964z"
        fill="#44b78b"
      />
    </svg>
  );
};

export default DjangoIcon;
