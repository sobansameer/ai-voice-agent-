import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center py-6 md:py-8">
      <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
        AI Sales & Marketing Voice Agent
      </h1>
      <p className="text-gray-400 mt-2">
        Engage with your global audience in 10 languages.
      </p>
    </header>
  );
};

export default Header;
