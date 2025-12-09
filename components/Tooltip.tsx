import React from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ text, children }) => {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative flex flex-col items-center" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute bottom-full mb-2 w-max max-w-xs p-2 bg-black/80 text-white text-xs rounded z-50 pointer-events-none">
          {text}
        </div>
      )}
    </div>
  );
};