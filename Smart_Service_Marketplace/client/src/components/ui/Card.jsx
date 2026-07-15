function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl bg-white p-8 shadow-xl ${className}`}
    >
      {children}
    </div>
  );
}

export default Card;