// test_runner.go - テストコードの構文チェック用
package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func main() {
	fmt.Println("=== テストファイル構文チェック ===")
	
	testFiles := []string{
		"internal/domain/quiz_test.go",
		"internal/domain/participant_test.go", 
		"internal/domain/user_test.go",
		"internal/usecase/quiz_usecase_test.go",
		"internal/usecase/session_usecase_test.go",
		"internal/usecase/admin_usecase_test.go",
		"internal/service/ai_service_test.go",
		"internal/websocket/hub_test.go",
		"tests/handler/auth_handler_test.go",
		"tests/security/auth_security_test.go",
		"tests/concurrency/concurrent_test.go",
		"tests/performance/large_scale_test.go",
	}
	
	passCount := 0
	failCount := 0
	
	for _, testFile := range testFiles {
		fullPath := testFile
		if _, err := os.Stat(fullPath); err == nil {
			if checkBasicSyntax(fullPath) {
				fmt.Printf("✓ %s - 基本構文OK\n", testFile)
				passCount++
			} else {
				fmt.Printf("✗ %s - 構文エラーあり\n", testFile)
				failCount++
			}
		} else {
			fmt.Printf("? %s - ファイルが見つかりません\n", testFile)
			failCount++
		}
	}
	
	fmt.Printf("\n=== 結果 ===\n")
	fmt.Printf("正常: %d件\n", passCount)
	fmt.Printf("エラー: %d件\n", failCount)
	
	if failCount == 0 {
		fmt.Println("✓ 全てのテストファイルの基本構文チェックが完了しました")
	} else {
		fmt.Println("✗ 一部のテストファイルに問題があります")
	}
}

func checkBasicSyntax(filename string) bool {
	data, err := os.ReadFile(filename)
	if err != nil {
		return false
	}
	
	content := string(data)
	
	// 基本的な構文チェック
	checks := []struct {
		name string
		condition bool
	}{
		{"package宣言", strings.Contains(content, "package ")},
		{"import文", strings.Contains(content, "import ")},
		{"テスト関数", strings.Contains(content, "func Test")},
		{"testing import", strings.Contains(content, "testing")},
		{"括弧の対応", checkBracketBalance(content)},
	}
	
	allPassed := true
	for _, check := range checks {
		if !check.condition {
			fmt.Printf("    エラー: %s が見つかりません\n", check.name)
			allPassed = false
		}
	}
	
	return allPassed
}

func checkBracketBalance(content string) bool {
	brackets := 0
	braces := 0
	
	for _, char := range content {
		switch char {
		case '(':
			brackets++
		case ')':
			brackets--
		case '{':
			braces++
		case '}':
			braces--
		}
		
		if brackets < 0 || braces < 0 {
			return false
		}
	}
	
	return brackets == 0 && braces == 0
}