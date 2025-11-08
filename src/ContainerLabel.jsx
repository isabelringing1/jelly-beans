import { useState } from "react";

const ContainerLabel = (props) => {
  const { pos, category, wildcardCategory } = props;
  const [hover, setHover] = useState(false);
  var offsetY = (-window.innerHeight + pos.yOffset) / (pos.distance * 1.1);

  const getTitle = () => {
    if (!category) {
      return "";
    }
    if (category.diy) {
      return (
        wildcardCategory.charAt(0).toUpperCase() + wildcardCategory.slice(1)
      );
    }
    return category.label;
  };
  return (
    <div
      className={"container-label" + (hover ? " label-hover" : "")}
      id={"container-label-" + category.index}
      style={{
        top: pos.y + offsetY + "px",
        left: pos.x + "px",
        height: 140 / pos.distance + "px",
        width: 500 / pos.distance + "px",
        fontSize: 40 / pos.distance + "px",
        opacity: pos.percentage > 0 ? 1 : 0,
      }}
      onClick={() => {
        document.dispatchEvent(
          new CustomEvent("category-selected", {
            detail: { index: category.index },
          })
        );
      }}
      onMouseEnter={() => {
        setHover(true);
      }}
      onMouseOut={() => {
        setHover(false);
      }}
    >
      <div
        className="container-text container-title"
        id={"container-title-" + category.index}
      >
        {getTitle()}
      </div>
      <div className="container-text">
        {pos.amount.toLocaleString()} beans{" "}
        {pos.percentage < 100 && <span>({pos.percentage.toFixed(2)}%)</span>}
      </div>
      <div
        className={"container-tail" + (hover ? " tail-hover" : "")}
        style={{
          borderWidth:
            "0 " +
            3.2 / pos.distance +
            "vh " +
            3.4 / pos.distance +
            "vh " +
            3.2 / pos.distance +
            "vh",
          bottom: -3.25 / pos.distance + "vh",
        }}
      >
        {" "}
      </div>
    </div>
  );
};

export default ContainerLabel;
