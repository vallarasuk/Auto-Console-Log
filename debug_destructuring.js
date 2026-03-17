const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const code = `
const { requestToBecomeAnAdvisor, id, ctaLabel } = props;
const [isMobile] = useState(detectBrowser());
`;

const ast = parser.parse(code, {
  sourceType: "module",
  plugins: ["jsx", "typescript"],
});

traverse(ast, {
  enter(path) {
    if (path.isVariableDeclaration()) {
      console.log("Found VariableDeclaration");
      const declarations = path.node.declarations;
      declarations.forEach((decl) => {
        console.log("Decl ID Type:", decl.id.type);

        if (decl.id.type === "ObjectPattern") {
          console.log("ObjectPattern properties:", decl.id.properties.length);
          decl.id.properties.forEach((prop) => {
            console.log("Prop Type:", prop.type);
            if (prop.type === "ObjectProperty") {
              console.log("Key Type:", prop.key.type);
              console.log("Value Type:", prop.value.type);
              console.log("Shorthand:", prop.shorthand);

              if (prop.value.type === "Identifier") {
                console.log("Pushing Value Name:", prop.value.name);
              } else if (prop.key.type === "Identifier" && prop.shorthand) {
                console.log("Pushing Key Name:", prop.key.name);
              }
            }
          });
        } else if (decl.id.type === "ArrayPattern") {
          console.log("ArrayPattern elements:", decl.id.elements.length);
          decl.id.elements.forEach((elem) => {
            if (elem && elem.type === "Identifier") {
              console.log("Pushing Array Element:", elem.name);
            }
          });
        }
      });
    }
  },
});
