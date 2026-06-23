import React from "react";

const OptimizedChild = React.memo(function({name, onClick}){
console.log("Optimized child rendered");

return (
<div
style={{
        border: "1px solid green",
        padding: "12px",
        marginTop: "12px",
        borderRadius: "8px",
      }}
>
  <h3>Optimized Child Component</h3>
  <p>Name: {name}</p>
  <button onClick={onClick}>Click Optimized Child</button>
</div>
);
});

export default OptimizedChild;