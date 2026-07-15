function PageHeader({ title, subtitle }) {
  return (
    <div className="mb-8">

      <h2 className="text-3xl font-bold">
        {title}
      </h2>

      <p className="text-gray-500 mt-2">
        {subtitle}
      </p>

    </div>
  );
}

export default PageHeader;