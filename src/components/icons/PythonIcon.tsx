import React from 'react';

interface PythonIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

const PythonIcon: React.FC<PythonIconProps> = ({
  className = 'icon icon-tabler icons-tabler-outline icon-tabler-brand-python',
  size = 24,
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
      {...props}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12 9h-7a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h3" />
      <path d="M12 15h7a2 2 0 0 0 2 -2v-4a2 2 0 0 0 -2 -2h-3" />
      <path d="M8 9v-4a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v5a2 2 0 0 1 -2 2h-4a2 2 0 0 0 -2 2v5a2 2 0 0 0 2 2h4a2 2 0 0 0 2 -2v-4" />
      <path d="M11 6l0 .01" />
      <path d="M13 18l0 .01" />
    </svg>
  );
};

export default PythonIcon;
