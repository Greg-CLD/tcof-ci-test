import React from "react";

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h3 className="text-lg font-bold mb-1">Starter Kit Access</h3>
            <p className="text-gray-400 text-sm">Strategic planning tools for your journey</p>
          </div>
          <div className="flex space-x-4">
            <a href="#" className="text-gray-400 hover:text-white transition">
              <i className="ri-file-text-line text-xl"></i>
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition">
              <i className="ri-question-line text-xl"></i>
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition">
              <i className="ri-feedback-line text-xl"></i>
            </a>
          </div>
        </div>
        <div className="mt-6 text-center text-gray-400 text-sm">
          <p>Data is stored locally on your device. No information is sent to external servers.</p>
        </div>
      </div>
    </footer>
  );
}
