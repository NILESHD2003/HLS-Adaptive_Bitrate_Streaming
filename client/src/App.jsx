import React from "react";
import {Routes, Route} from "react-router-dom";
import Upload from "./components/Upload.jsx";
import Watch from "./components/Watch.jsx";

function App() {
    return (
        <Routes>
            <Route path="/" element={<Upload />} />
            <Route path={"/watch"} element={<Watch/>}></Route>
        </Routes>
    );
}

export default App;