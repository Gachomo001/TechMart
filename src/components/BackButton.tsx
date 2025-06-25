import React from 'react';
import { useNavigate } from 'react-router-dom';

interface BackButtonProps {
  onClick?: () => void;
  text?: string;
}

const BackButton: React.FC<BackButtonProps> = ({ onClick, text = "Go Back" }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(-1); // Go back to previous page
    }
  };

  return (
    <button 
      onClick={handleClick}
      className="bg-white text-center w-32 md:w-48 rounded-2xl h-10 md:h-14 relative text-black text-base md:text-xl font-semibold group" 
      type="button"
    >
      <div className="bg-green-400 rounded-xl h-8 md:h-12 w-1/4 flex items-center justify-center absolute left-1 top-[4px] group-hover:w-[120px] md:group-hover:w-[184px] z-10 duration-500">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" height="20px" width="20px" className="md:h-[25px] md:w-[25px]">
          <path d="M224 480h640a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64z" fill="#000000" />
          <path d="m237.248 512 265.408 265.344a32 32 0 0 1-45.312 45.312l-288-288a32 32 0 0 1 0-45.312l288-288a32 32 0 1 1 45.312 45.312L237.248 512z" fill="#000000" />
        </svg>
      </div>
      <p className="translate-x-3 md:translate-x-5 text-sm md:text-base">{text}</p>
    </button>
  );
};

export default BackButton; 