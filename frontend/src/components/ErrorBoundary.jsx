import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      hasError: false,
      error: null
    }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error, info) {
    console.error('REACT CRASH:', error)
    console.error('COMPONENT STACK:', info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-xl rounded-xl border p-6">
            <h1 className="text-xl font-bold text-red-600">
              Something went wrong
            </h1>

            <p className="mt-3 text-sm">
              {this.state.error?.message || 'Unknown React error'}
            </p>

            <button
              className="mt-4 rounded-lg bg-black px-4 py-2 text-white"
              onClick={() => window.location.reload()}
            >
              Reload App
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}