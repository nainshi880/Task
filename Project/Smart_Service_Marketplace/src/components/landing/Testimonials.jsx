import { Star } from "lucide-react";

const reviews = [
  {
    name: "Rahul Sharma",
    city: "Delhi",
    review:
      "Amazing experience. The technician arrived on time and solved my issue professionally.",
  },
  {
    name: "Priya Verma",
    city: "Lucknow",
    review:
      "Very easy booking process. Highly recommended for home services.",
  },
  {
    name: "Ankit Singh",
    city: "Noida",
    review:
      "Fast service and excellent customer support. Loved the experience.",
  },
];

function Testimonials() {
  return (
    <section className="py-24 bg-slate-50">

      <div className="max-w-7xl mx-auto px-6">

        <div className="text-center">

          <h2 className="text-4xl font-bold">
            What Our Customers Say
          </h2>

        </div>

        <div className="grid gap-8 mt-16 lg:grid-cols-3">

          {reviews.map((review) => (

            <div
              key={review.name}
              className="rounded-2xl bg-white p-8 shadow-md"
            >

              <div className="flex gap-1 text-yellow-500">

                {[...Array(5)].map((_, index) => (
                  <Star
                    key={index}
                    size={18}
                    fill="currentColor"
                  />
                ))}

              </div>

              <p className="mt-6 text-slate-600">

                "{review.review}"

              </p>

              <h4 className="mt-6 font-semibold">

                {review.name}

              </h4>

              <span className="text-sm text-slate-500">

                {review.city}

              </span>

            </div>

          ))}

        </div>

      </div>

    </section>
  );
}

export default Testimonials;