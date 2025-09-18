import Markdown from "react-markdown";

const Text = (props) => {
  const { text, title } = props;
  var cn = "text-div";
  if (title) {
    cn += " title";
  }
  return (
    <div className={cn}>
      <Markdown>{text}</Markdown>
    </div>
  );
};

export default Text;
