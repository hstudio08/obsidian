export function BottomNavSvg({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 375 80" 
      preserveAspectRatio="none" 
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M0 20C0 8.954 8.954 0 20 0H127C143 0 155 12 161 28C167 44 176 48 187.5 48C199 48 208 44 214 28C220 12 232 0 248 0H355C366.046 0 375 8.954 375 20V80H0V20Z" />
    </svg>
  );
}
