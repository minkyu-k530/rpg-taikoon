using System.Globalization;
using System.IO;
using System.Text;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Unjungcheon.EditorTools
{
    // 씬 파일의 로컬 fileID는 Unity가 실행마다 새로 매기므로 바이트 비교로는 결정성을 확인할 수 없다.
    // 대신 계층 경로, 위치·회전·크기, 컴포넌트, 재질을 정규화한 텍스트로 남겨 실행 간에 비교한다.
    public static class SceneLayoutDump
    {
        public const string OutputPath = "Build/Logs/scene-layout.txt";

        public static string Write()
        {
            var scene = EditorSceneManager.OpenScene(SceneBuilder.ScenePath);
            var sb = new StringBuilder();
            foreach (GameObject root in scene.GetRootGameObjects()) Append(sb, root.transform, "");
            Directory.CreateDirectory(Path.GetDirectoryName(OutputPath));
            File.WriteAllText(OutputPath, sb.ToString());
            string path = Path.GetFullPath(OutputPath);
            Debug.Log("Scene layout: " + path);
            return path;
        }

        static void Append(StringBuilder sb, Transform t, string parent)
        {
            string path = parent + "/" + t.name;
            CultureInfo c = CultureInfo.InvariantCulture;
            Vector3 p = t.localPosition, r = t.localEulerAngles, s = t.localScale;
            sb.AppendFormat(c, "{0} p({1:F3},{2:F3},{3:F3}) r({4:F2},{5:F2},{6:F2}) s({7:F3},{8:F3},{9:F3})",
                path, p.x, p.y, p.z, r.x, r.y, r.z, s.x, s.y, s.z);
            foreach (Component component in t.GetComponents<Component>())
            {
                if (component == null) { sb.Append(" [Missing]"); continue; }
                if (component is Transform) continue;
                sb.Append(' ').Append(component.GetType().Name);
                if (component is Renderer renderer && renderer.sharedMaterial != null) sb.Append('(').Append(renderer.sharedMaterial.name).Append(')');
            }
            sb.Append('\n');
            for (int i = 0; i < t.childCount; i++) Append(sb, t.GetChild(i), path);
        }
    }
}
