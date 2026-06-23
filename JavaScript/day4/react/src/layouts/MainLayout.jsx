import Navbar from "../components/common/Navbar";

function MainLayout({ children }) {
  return (
    <div>
      <Navbar />
      <main style={{ padding: "20px" }}>{children}</main>
    </div>
  );
}

export default MainLayout;