import { useState } from "react";

const ContainerLabel = (props) => {
  const { pos, category } = props;
  const [hover, setHover] = useState(false);
  var offsetY = (-window.innerHeight + pos.yOffset) / (pos.distance * 1.1);

  var title = category ? category.title : "";
  return (
    <div
      className={"container-label" + (hover ? " label-hover" : "")}
      id={"container-label-" + category.index}
      style={{
        top: pos.y + offsetY + "px",
        left: pos.x + "px",
        height: 140 / pos.distance + "px",
        width: 450 / pos.distance + "px",
        fontSize: 40 / pos.distance + "px",
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
        {title}
      </div>
      <div className="container-text"> {pos.amount.toLocaleString()} beans</div>
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
