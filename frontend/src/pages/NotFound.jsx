import { useNavigate } from "react-router-dom"

const NotFound = ()=>{
    const navigate = useNavigate();
    const Redirect = ()=>{navigate("/")}
    return(
        <div className="w-full text-3xl h-screen flex bg-zinc-950 text-white flex-col items-center justify-center">
            <span className="text-3xl">Hey Explorer,<br/> </span> 
            <span> You are out of place.</span>
            <button onClick={Redirect} className="bg-pink-800 text-lg m-3 text-white px-3 py-1 rounded shadow">Go Home</button>
        </div>
    )
}

export default NotFound;