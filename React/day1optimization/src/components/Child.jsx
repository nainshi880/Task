function Child ({name, onClick}){
console.log("Normal child rendered");

return (
<div
style={{
        border: "1px solid gray",
        padding: "12px",
        marginTop: "12px",
        borderRadius: "8px",
      }}
>
  <h3>Normal Child Component</h3>
  <p>Name: {name}</p>
  <button onClick={onClick}>Click Normal Child</button>
</div>
);
}

export default Child;