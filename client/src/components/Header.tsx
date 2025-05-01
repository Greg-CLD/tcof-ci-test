import React from "react";

type ActiveSection = "goal-mapping" | "cynefin" | "tcof";

interface HeaderProps {
  activeSection: ActiveSection;
  setActiveSection: (section: ActiveSection) => void;
}

export default function Header({ activeSection, setActiveSection }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Starter Kit Access</h1>
        <nav>
          <ul className="flex space-x-1 md:space-x-4">
            <li>
              <button
                className={`px-3 py-2 rounded-lg hover:bg-gray-100 font-medium text-sm ${
                  activeSection === "goal-mapping" ? "text-primary" : "text-gray-600"
                }`}
                onClick={() => setActiveSection("goal-mapping")}
              >
                <i className="ri-target-line mr-1"></i> Goal-Mapping
              </button>
            </li>
            <li>
              <button
                className={`px-3 py-2 rounded-lg hover:bg-gray-100 font-medium text-sm ${
                  activeSection === "cynefin" ? "text-primary" : "text-gray-600"
                }`}
                onClick={() => setActiveSection("cynefin")}
              >
                <i className="ri-compass-3-line mr-1"></i> Cynefin Tool
              </button>
            </li>
            <li>
              <button
                className={`px-3 py-2 rounded-lg hover:bg-gray-100 font-medium text-sm ${
                  activeSection === "tcof" ? "text-primary" : "text-gray-600"
                }`}
                onClick={() => setActiveSection("tcof")}
              >
                <i className="ri-git-branch-line mr-1"></i> TCOF Journey
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
