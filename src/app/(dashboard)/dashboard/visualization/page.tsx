

export default function VisualizationPage() {
  return (
    <div className="w-full h-screen">
      <iframe
        src="https://autoworxcarcustomizer.app/"
        title="AutoWorx Car Customizer Visualization"
        width="100%"
        height="100%"
        style={{ border: 'none' }}
        allow="camera; microphone; geolocation; xr-spatial-tracking"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation"
      />
    </div>
  );
}
