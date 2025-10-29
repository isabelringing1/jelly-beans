import { useState, useEffect } from "react";
import CategoryCard from "./CategoryCard";
import categories from "./json/categories.json";

const Categories = (props) => {
  const { show } = props;
  var cn = show ? "" : "hidden";
  var column1 = categories["column-1"];
  var column3 = categories["column-3"];

  const [showHelper, setShowHelper] = useState(true);
  const [showError, setShowError] = useState(false);
  const [selectedCardIndex, setSelectedCardIndex] = useState(-1);

  useEffect(() => {
    document.addEventListener("overboard", () => {
      setShowError(true);
      setTimeout(() => {
        setShowError(false);
      }, 1000);
    });
  }, []);

  const onCategoryCardClicked = () => {
    setShowHelper(false);
  };
  return (
    <div
      id="categories"
      className={cn}
      onClick={(e) => {
        console.log("here");
        if (!e.target.closest(".category-card")) {
          setSelectedCardIndex(-1);
        }
      }}
    >
      <div className="column" id="column-1">
        {column1.map((question, i) => {
          return (
            <CategoryCard
              card={question}
              index={question.index}
              key={"category-" + i}
              categoryCardClicked={onCategoryCardClicked}
              setSelectedCardIndex={setSelectedCardIndex}
              selected={question.index == selectedCardIndex}
            />
          );
        })}
        ;
      </div>
      <div className="column" id="column-2">
        {showHelper && (
          <div className="column-2-text">
            Click on each section to enter data.
          </div>
        )}

        {showError && (
          <div className="column-error">
            Not enough Jelly Beans! Check your data.
          </div>
        )}
      </div>
      <div className="column" id="column-3">
        {column3.map((question, i) => {
          return (
            <CategoryCard
              card={question}
              index={question.index}
              key={"category-" + i}
              categoryCardClicked={onCategoryCardClicked}
              setSelectedCardIndex={setSelectedCardIndex}
              selected={selectedCardIndex == question.index}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Categories;
