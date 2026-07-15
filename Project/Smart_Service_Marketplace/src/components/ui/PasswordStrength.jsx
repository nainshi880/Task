function PasswordStrength({ password = "" }) {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-green-500",
  ];

  const labels = [
    "Weak",
    "Fair",
    "Good",
    "Strong",
  ];

  return (
    <div className="mt-3">

      <div className="flex gap-2">

        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={`h-2 flex-1 rounded-full transition-all duration-300 ${
              index < score
                ? colors[score - 1]
                : "bg-slate-200"
            }`}
          />
        ))}

      </div>

      {password && (
        <p className="mt-2 text-sm text-slate-600">
          Password Strength:
          <span className="font-semibold ml-1">
            {labels[score - 1] || "Very Weak"}
          </span>
        </p>
      )}

      <ul className="mt-3 space-y-1 text-sm">

        <li className={checks.length ? "text-green-600" : "text-slate-500"}>
          ✓ Minimum 8 characters
        </li>

        <li className={checks.uppercase ? "text-green-600" : "text-slate-500"}>
          ✓ One uppercase letter
        </li>

        <li className={checks.number ? "text-green-600" : "text-slate-500"}>
          ✓ One number
        </li>

        <li className={checks.special ? "text-green-600" : "text-slate-500"}>
          ✓ One special character
        </li>

      </ul>

    </div>
  );
}

export default PasswordStrength;