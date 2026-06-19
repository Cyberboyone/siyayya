import React from "react";

interface SchemaMarkupProps {
  data: object;
}

const SchemaMarkup: React.FC<SchemaMarkupProps> = ({ data }) => {
  return (
    <script type="application/ld+json">
      {JSON.stringify(data)}
    </script>
  );
};

export default SchemaMarkup;
