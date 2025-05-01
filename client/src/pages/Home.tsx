import React, { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GoalMappingTool from "@/components/GoalMappingTool";
import CynefinOrientationTool from "@/components/CynefinOrientationTool";
import TCOFJourneyTool from "@/components/TCOFJourneyTool";

type ActiveSection = "goal-mapping" | "cynefin" | "tcof";

export default function Home() {
  const [activeSection, setActiveSection] = useState<ActiveSection>("goal-mapping");

  return (
    <div className="min-h-screen flex flex-col">
      <Header activeSection={activeSection} setActiveSection={setActiveSection} />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {activeSection === "goal-mapping" && <GoalMappingTool />}
        {activeSection === "cynefin" && <CynefinOrientationTool />}
        {activeSection === "tcof" && <TCOFJourneyTool />}
      </main>
      
      <Footer />
    </div>
  );
}
