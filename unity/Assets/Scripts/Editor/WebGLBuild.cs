using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace Unjungcheon.EditorTools
{
    // 1번 공간 씬을 GitHub Pages용 WebGL로 빌드한다.
    // Pages는 Content-Encoding 헤더를 주지 않으므로 압축 파일은 Decompression Fallback(브라우저 JS 해제)으로 읽는다.
    public static class WebGLBuild
    {
        public const string OutputDir = "Build/WebGL";
        public const int Width = 1600, Height = 900;
        const long PagesFileLimit = 100L * 1024 * 1024;

        // 데스크톱에서도 캔버스를 창 크기에 맞춘다. 기본 템플릿은 고정 크기로 가운데 둔다.
        const string FitWindowStyle =
            "<style>html,body{width:100%;height:100%;overflow:hidden;background:#05060a}" +
            "#unity-container.unity-desktop{left:0;top:0;transform:none;width:100%;height:100%}" +
            ".unity-desktop #unity-canvas{width:100%!important;height:100%!important;display:block}" +
            "#unity-footer{display:none}</style>";

        public static bool Build()
        {
            PlayerSettings.defaultWebScreenWidth = Width;
            PlayerSettings.defaultWebScreenHeight = Height;
            PlayerSettings.runInBackground = true;
            PlayerSettings.WebGL.template = "APPLICATION:Default";
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Gzip;
            PlayerSettings.WebGL.decompressionFallback = true;
            PlayerSettings.WebGL.dataCaching = true;
            PlayerSettings.WebGL.exceptionSupport = WebGLExceptionSupport.ExplicitlyThrownExceptionsOnly;

            if (Directory.Exists(OutputDir)) Directory.Delete(OutputDir, true);
            var options = new BuildPlayerOptions
            {
                scenes = new[] { SceneBuilder.ScenePath },
                locationPathName = OutputDir,
                target = BuildTarget.WebGL,
                targetGroup = BuildTargetGroup.WebGL,
                options = BuildOptions.None,
            };
            BuildReport report = BuildPipeline.BuildPlayer(options);
            BuildSummary summary = report.summary;
            Debug.Log($"WebGL build: {summary.result}, {summary.totalSize / 1048576.0:F1} MB, {summary.totalTime.TotalSeconds:F0}s, errors {summary.totalErrors}, warnings {summary.totalWarnings}");
            if (summary.result != BuildResult.Succeeded) return false;

            File.WriteAllText(Path.Combine(OutputDir, ".nojekyll"), "");
            string index = Path.Combine(OutputDir, "index.html");
            string html = File.ReadAllText(index);
            if (!html.Contains(FitWindowStyle)) File.WriteAllText(index, html.Replace("</head>", FitWindowStyle + "\n  </head>"));

            FileInfo largest = new DirectoryInfo(OutputDir).GetFiles("*", SearchOption.AllDirectories).OrderByDescending(f => f.Length).First();
            Debug.Log($"WebGL largest file: {largest.FullName} {largest.Length / 1048576.0:F2} MB");
            if (largest.Length > PagesFileLimit)
            {
                Debug.LogError("WebGL 파일 하나가 100MB를 넘는다: " + largest.FullName);
                return false;
            }
            Debug.Log("WebGL output: " + Path.GetFullPath(OutputDir));
            return true;
        }
    }
}
