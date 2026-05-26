import * as Icons from 'lucide-react';

interface CategoryIconProps {
  name: string;
  className?: string;
  id?: string;
}

export default function CategoryIcon({ name, className = 'w-5 h-5', id }: CategoryIconProps) {
  // Safe dynamic resolver for icons in lucide-react
  const IconComponent = (Icons as any)[name];
  
  if (!IconComponent) {
    return <Icons.HelpCircle className={className} id={id || "fallback-icon"} />;
  }
  
  return <IconComponent className={className} id={id || `icon-${name}`} />;
}
