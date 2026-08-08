import { useNavigate } from "react-router-dom";

import Button from "../../ui/Button";
import useAuth from "../../../hooks/useAuth";
import { ROLES } from "../../../constants/roles";

/**
 * Book Now — guests are sent to login, then returned to the book-service URL.
 */
function BookNowButton({
  bookUrl,
  children = "Book Now",
  className,
  size = "lg",
  fullWidth = false,
}) {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();

  const handleClick = () => {
    if (isAuthenticated && role === ROLES.CUSTOMER) {
      navigate(bookUrl);
      return;
    }

    const [pathname, query = ""] = String(bookUrl).split("?");
    navigate("/login", {
      state: {
        from: {
          pathname: pathname || "/book-service",
          search: query ? `?${query}` : "",
        },
      },
    });
  };

  return (
    <Button
      type="button"
      size={size}
      className={fullWidth ? `w-full ${className || ""}` : className}
      onClick={handleClick}
    >
      {children}
    </Button>
  );
}

export default BookNowButton;
