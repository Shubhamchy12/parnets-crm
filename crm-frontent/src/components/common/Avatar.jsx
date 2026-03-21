const colors = ['bg-indigo-500','bg-purple-500','bg-pink-500','bg-blue-500','bg-green-500','bg-orange-500'];

const Avatar = ({ name = '', src, size = 'md' }) => {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-xl' };
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const color = colors[name.charCodeAt(0) % colors.length];

  if (src) return <img src={src} alt={name} className={`${sizes[size]} rounded-full object-cover`} />;
  return (
    <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {initials || '?'}
    </div>
  );
};

export default Avatar;
