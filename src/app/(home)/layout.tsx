import Footer from "./components/landing-page/Footer";
import Navbar from "./components/landing-page/Navbar";
import { Figtree } from "next/font/google";


const figtree = Figtree({
  subsets: ["latin"],
});
export default async function LandingPageLayout({children}: Readonly<{
  children: React.ReactNode;
}>){
    return (
        <div style={figtree.style}>
        <Navbar/>
        {children}
        <Footer/>
        </div>
    )
}