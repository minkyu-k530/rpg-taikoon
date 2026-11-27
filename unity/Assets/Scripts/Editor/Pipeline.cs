using UnityEditor;
using UnityEngine;

namespace Unjungcheon.EditorTools
{
    // -executeMethod Unjungcheon.EditorTools.Pipeline.BuildAll
    public static class Pipeline
    {
        public static void BuildAll()
        {
            try
            {
                ProjectSetup.Create();
                SceneBuilder.Build();
                foreach (string png in ScreenshotCapture.Capture()) Debug.Log("PNG: " + png);
                SceneLayoutDump.Write();
                Debug.Log("Scene: " + SceneBuilder.ScenePath);
                EditorApplication.Exit(0);
            }
            catch (System.Exception e)
            {
                Debug.LogException(e);
                EditorApplication.Exit(1);
            }
        }

        // -buildTarget WebGL -executeMethod Unjungcheon.EditorTools.Pipeline.BuildWebGL
        public static void BuildWebGL()
        {
            try
            {
                if (!System.IO.File.Exists(SceneBuilder.ScenePath))
                {
                    ProjectSetup.Create();
                    SceneBuilder.Build();
                }
                EditorApplication.Exit(WebGLBuild.Build() ? 0 : 1);
            }
            catch (System.Exception e)
            {
                Debug.LogException(e);
                EditorApplication.Exit(1);
            }
        }
    }
}
