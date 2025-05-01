import React from "react";
import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h3 className="text-lg font-bold mb-1">Starter Kit Access</h3>
            <p className="text-gray-400 text-sm">Strategic planning tools for your journey</p>
          </div>
          <div className="flex space-x-6">
            <Link href="/pricing" className="text-gray-400 hover:text-white transition flex items-center">
              <i className="ri-price-tag-3-line text-xl mr-1"></i>
              <span>Pricing</span>
            </Link>
            <a href="#" className="text-gray-400 hover:text-white transition flex items-center">
              <i className="ri-question-line text-xl mr-1"></i>
              <span>Help</span>
            </a>
            <Link href="/pro-tools" className="text-gray-400 hover:text-white transition flex items-center">
              <i className="ri-lock-line text-xl mr-1"></i>
              <span>Pro Tools</span>
            </Link>
          </div>
        </div>
        <div className="mt-6 text-center text-gray-400 text-sm">
          <p>Free tools store data locally on your device. Premium features may require account creation.</p>
        </div>
      </div>
    </footer>
  );
}
