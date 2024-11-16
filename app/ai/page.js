'use client'

export default function SimpleAIPage() {
    const handleClick = () => {
        alert("Hello from AI!")
    }

    return (
        <div>
            <h1>Welcome to AI Page</h1>
            <p>This is a simple JavaScript page in Next.js</p>
            <button onClick={handleClick}>Click me!</button>
        </div>
    )
}
