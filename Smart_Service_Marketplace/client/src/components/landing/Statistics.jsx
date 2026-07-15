const stats = [
  {
    value: "10K+",
    label: "Customers",
  },
  {
    value: "500+",
    label: "Technicians",
  },
  {
    value: "30K+",
    label: "Completed Services",
  },
  {
    value: "4.9★",
    label: "Average Rating",
  },
];

function Statistics() {
  return (
    <section className="bg-indigo-600 py-20">

      <div className="max-w-7xl mx-auto px-6">

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">

          {stats.map((item) => (

            <div
              key={item.label}
              className="text-center text-white"
            >

              <h2 className="text-5xl font-bold">

                {item.value}

              </h2>

              <p className="mt-3 text-indigo-100">

                {item.label}

              </p>

            </div>

          ))}

        </div>

      </div>

    </section>
  );
}

export default Statistics;