import React from 'react';
import { Link, useLocation } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const Breadcrumb = () => {
  const [location] = useLocation();
  
  // Skip rendering breadcrumbs on home page
  if (location === '/') {
    return null;
  }

  // Parse the current path and generate breadcrumb items
  const pathSegments = location.split('/').filter(Boolean);
  
  // Map the path segments to readable labels
  const pathLabels: Record<string, string> = {
    'get-your-bearings': 'Get Your Bearings',
    'make-a-plan': 'Make a Plan',
    'full': 'Full Plan',
    'block-1': 'Block 1: Discover',
    'block-2': 'Block 2: Design',
    'block-3': 'Block 3: Complete',
    'admin': 'Admin',
    'checklist': 'Checklist',
    'tools': 'Tools',
    'goal-mapping': 'Goal Mapping',
    'cynefin-orientation': 'Cynefin Orientation',
    'tcof-journey': 'TCOF Journey',
    'dashboard': 'Dashboard',
    'profile': 'Profile',
    'history': 'History',
    'pricing': 'Pricing',
    'pro-tools': 'Pro Tools',
    'auth': 'Authentication',
    'starter-access': 'Starter Access'
  };

  // Special case for project-profile route
  let breadcrumbItems = [];
  
  if (location === '/get-your-bearings/project-profile') {
    // For project-profile, only show "Home > Project Profile"
    breadcrumbItems = [
      {
        path: '/get-your-bearings/project-profile',
        label: 'Project Profile',
        isLast: true
      }
    ];
  } else {
    // Build the breadcrumb items with cumulative paths for other routes
    breadcrumbItems = pathSegments.map((segment, index) => {
      const path = '/' + pathSegments.slice(0, index + 1).join('/');
      const label = pathLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      const isLast = index === pathSegments.length - 1;

      return {
        path,
        label,
        isLast
      };
    });
  }

  return (
    <div className="bg-gray-50 py-2 border-b border-gray-200">
      <div className="container mx-auto px-4">
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link 
                href="/" 
                className="inline-flex items-center text-sm text-gray-600 hover:text-tcof-teal"
              >
                Home
              </Link>
            </li>
            
            {breadcrumbItems.map((item, index) => (
              <li key={index} className="flex items-center">
                <ChevronRight size={16} className="text-gray-400 mx-1" aria-hidden="true" />
                {item.isLast ? (
                  <span className="text-sm font-medium text-tcof-teal">{item.label}</span>
                ) : (
                  <Link 
                    href={item.path} 
                    className="text-sm text-gray-600 hover:text-tcof-teal"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </div>
  );
};

export default Breadcrumb;