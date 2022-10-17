import logo from "./logo.svg";
import "./App.css";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./component/home";

import "bootstrap/dist/css/bootstrap.min.css";
function App() {
  return (
    <Router>
      <Routes>
        {/* <Route path="/"> */}
        <Route exact path="/" element={<Home />} />

        {/* </Route> */}
        {/* <Route path="/users">
            <Users />
          </Route>
          <Route path="/">
            <Home />
          </Route> */}
      </Routes>
    </Router>
  );
}

export default App;
